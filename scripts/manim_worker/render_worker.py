"""
Prototype Manim worker.

Usage (local prototype):
  python render_worker.py

This script polls the repository-local `manim_jobs` directory for jobs (JSON files),
creates a Manim script derived from the prompt (template-based, not executing
arbitrary code), runs `manim` to render an mp4, and writes the resulting `resultUrl`
into the job JSON.

NOTE:
- This worker must NOT execute untrusted arbitrary code.
- It only renders from structured JSON sceneParams.
"""

import time
import os
import json
import shutil
import subprocess
from pathlib import Path
import math

import boto3
from botocore.exceptions import BotoCoreError, ClientError

ROOT = Path(__file__).resolve().parents[2]
JOB_DIR = ROOT / "manim_jobs"
OUTPUT_DIR = ROOT / "public" / "manim_videos"


def ensure_dirs():
    JOB_DIR.mkdir(exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def pick_job():
    for p in JOB_DIR.glob("manim-*.json"):
        try:
            job = json.loads(p.read_text())
            if job.get("status") == "queued":
                return p, job
        except Exception:
            continue
    return None, None


def write_job(p, job):
    p.write_text(json.dumps(job, indent=2))


def safe_title(prompt: str):
    t = (prompt or "").strip().split("\n")[0][:50]
    return t.replace('"', "").replace("'", "")


def escape_py_string(s: str):
    if s is None:
        return ""
    return str(s).replace("\\", "\\\\").replace('"', '\\"')


# -------------------------
# Scene Builders
# -------------------------

def build_text_scene(title: str, content: str):
    title = escape_py_string(title)
    content = content or ""
    lines = [l.strip() for l in content.split("\n") if l.strip()]
    if not lines:
        lines = [content.strip()] if content.strip() else [title]

    # Limit lines to keep video clean
    lines = lines[:7]
    lines = [escape_py_string(l) for l in lines]

    script_lines = [
        "from manim import *",
        "",
        "class GeneratedScene(Scene):",
        "    def construct(self):",
        f'        title = Text("{title}", font_size=52).to_edge(UP)',
        "        self.play(Write(title))",
        "",
    ]

    for i, line in enumerate(lines):
        # Position lines nicely under title
        y = 1.8 - i * 0.65
        script_lines.append(f'        t{i} = Text("{line}", font_size=34).move_to([0, {y}, 0])')
        script_lines.append(f"        self.play(Write(t{i}))")

    script_lines.append("        self.wait(2)")
    return "\n".join(script_lines)


def build_list_scene(title: str, items):
    title = escape_py_string(title)
    items = items or []
    items = [escape_py_string(str(x)) for x in items][:8]

    script_lines = [
        "from manim import *",
        "",
        "class GeneratedScene(Scene):",
        "    def construct(self):",
        f'        title = Text("{title}", font_size=52).to_edge(UP)',
        "        self.play(Write(title))",
        "",
    ]

    for i, it in enumerate(items):
        y = 1.8 - i * 0.6
        script_lines.append(f'        it{i} = Text("• {it}", font_size=34).move_to([-4.5, {y}, 0]).align_to(title, LEFT)')
        script_lines.append(f"        self.play(Write(it{i}))")

    script_lines.append("        self.wait(2)")
    return "\n".join(script_lines)


def build_dfa_scene(title: str, nodes, edges, explanation: str = ""):
    title = escape_py_string(title)
    nodes = nodes or []
    edges = edges or []

    # spread nodes horizontally (max 6)
    nodes = nodes[:6]

    script_lines = [
        "from manim import *",
        "",
        "class GeneratedScene(Scene):",
        "    def construct(self):",
        f'        title = Text("{title}", font_size=52).to_edge(UP)',
        "        self.play(Write(title))",
        "",
    ]

    # Position nodes evenly
    node_count = len(nodes)
    if node_count == 0:
        return build_text_scene(title, "No DFA nodes provided.")

    # x positions: centered
    start_x = -2.5
    spacing = 2.0
    if node_count > 1:
        start_x = -((node_count - 1) * spacing) / 2

    for i, n in enumerate(nodes):
        nid = escape_py_string(n.get("id", f"q{i}"))
        label = escape_py_string(n.get("label", nid))
        accept = bool(n.get("accept", False))
        start = bool(n.get("start", False))

        x = start_x + i * spacing
        script_lines.append(f"        {nid} = Circle(radius=0.45, color=BLUE).move_to([{x}, 0, 0])")
        script_lines.append(f'        {nid}_label = MathTex("{label}").scale(0.9).move_to({nid}.get_center())')

        if accept:
            script_lines.append(f"        {nid}_accept = Circle(radius=0.55, color=BLUE).move_to({nid}.get_center())")

        script_lines.append(f"        self.play(Create({nid}), Write({nid}_label))")
        if accept:
            script_lines.append(f"        self.play(Create({nid}_accept))")

        if start:
            script_lines.append(f"        start_arrow_{nid} = Arrow([{x-1.2}, 0, 0], {nid}.get_left(), buff=0.1)")
            script_lines.append(f"        self.play(Create(start_arrow_{nid}))")

    script_lines.append("")
    script_lines.append("        # Edges")
    for e in edges[:12]:
        frm = escape_py_string(e.get("from", ""))
        to = escape_py_string(e.get("to", ""))
        lab = escape_py_string(e.get("label", ""))

        if not frm or not to:
            continue

        script_lines.append(f"        arr = Arrow({frm}.get_center(), {to}.get_center(), buff=0.6)")
        script_lines.append("        self.play(Create(arr))")
        if lab:
            script_lines.append(f'        lbl = MathTex("{lab}").scale(0.8).next_to(arr, UP)')
            script_lines.append("        self.play(Write(lbl))")

    if explanation:
        explanation = escape_py_string(explanation)
        script_lines.append("")
        script_lines.append(f'        expl = Text("{explanation}", font_size=30).to_edge(DOWN)')
        script_lines.append("        self.play(Write(expl))")

    script_lines.append("        self.wait(2)")
    return "\n".join(script_lines)


def build_diagram_scene(title: str, nodes, edges):
    """
    Generic diagram: boxes + arrows.
    nodes: [{id, label}]
    edges: [{from, to, label?}]
    """
    title = escape_py_string(title)
    nodes = nodes or []
    edges = edges or []

    nodes = nodes[:6]
    edges = edges[:10]

    if len(nodes) == 0:
        # fallback: show title only
        return build_text_scene(title, "No diagram nodes provided.")

    script_lines = [
        "from manim import *",
        "",
        "class GeneratedScene(Scene):",
        "    def construct(self):",
        f'        title = Text("{title}", font_size=52).to_edge(UP)',
        "        self.play(Write(title))",
        "",
    ]

    # positions in a simple layout
    # If 3 nodes -> client/server/db style triangle layout
    # Else -> horizontal layout
    if len(nodes) == 3:
        positions = [[-4, 0, 0], [0, 0, 0], [4, 0, 0]]
    else:
        spacing = 3.0
        start_x = -((len(nodes) - 1) * spacing) / 2
        positions = [[start_x + i * spacing, 0, 0] for i in range(len(nodes))]

    # create boxes
    for i, n in enumerate(nodes):
        nid = escape_py_string(n.get("id", f"n{i}"))
        label = escape_py_string(n.get("label", nid))

        x, y, z = positions[i]
        script_lines.append(f'        {nid}_txt = Text("{label}", font_size=30)')
        script_lines.append(f"        {nid} = SurroundingRectangle({nid}_txt, buff=0.35, corner_radius=0.2)")
        script_lines.append(f"        {nid}_grp = VGroup({nid}, {nid}_txt).move_to([{x}, {y}, {z}])")
        script_lines.append(f"        self.play(FadeIn({nid}_grp))")

    script_lines.append("")
    script_lines.append("        # Draw arrows")
    for e in edges:
        frm = escape_py_string(e.get("from", ""))
        to = escape_py_string(e.get("to", ""))
        lab = escape_py_string(e.get("label", ""))

        if not frm or not to:
            continue

        script_lines.append(f"        arr = Arrow({frm}_grp.get_right(), {to}_grp.get_left(), buff=0.15)")
        script_lines.append("        self.play(Create(arr))")
        if lab:
            script_lines.append(f'        lbl = Text("{lab}", font_size=24).next_to(arr, UP)')
            script_lines.append("        self.play(Write(lbl))")

    script_lines.append("        self.wait(2)")
    return "\n".join(script_lines)


def build_quadratic_scene(title: str, a: float, b: float, c: float, show_formula=True):
    title = escape_py_string(title)

    # Make sure numeric
    try:
        a = float(a)
        b = float(b)
        c = float(c)
    except Exception:
        a, b, c = 1.0, -3.0, -4.0

    # formula string
    formula_str = f"y = {a}x^2 + {b}x + {c}"
    formula_str = formula_str.replace("+ -", "- ")

    script_lines = [
        "from manim import *",
        "import numpy as np",
        "",
        "class GeneratedScene(Scene):",
        "    def construct(self):",
        f'        title = Text("{title}", font_size=52).to_edge(UP)',
        "        self.play(Write(title))",
        "",
        "        axes = Axes(x_range=[-6,6,1], y_range=[-6,6,1], x_length=10, y_length=5, tips=False)",
        "        axes = axes.shift(DOWN*0.5)",
        "        self.play(Create(axes))",
        "",
        f"        a = {a}",
        f"        b = {b}",
        f"        c = {c}",
        "        f = lambda x: a*x*x + b*x + c",
        "        graph = axes.plot(lambda x: f(x), x_range=[-6, 6], use_smoothing=True)",
        "        self.play(Create(graph))",
        "",
    ]

    if show_formula:
        script_lines += [
            f'        formula = MathTex("{escape_py_string(formula_str)}").scale(0.9).to_edge(DOWN)',
            "        self.play(Write(formula))",
            "",
        ]

    # Vertex
    script_lines += [
        "        # Vertex",
        "        if a != 0:",
        "            xv = -b/(2*a)",
        "            yv = f(xv)",
        "            v_dot = Dot(axes.coords_to_point(xv, yv))",
        '            v_lbl = Text("Vertex", font_size=24).next_to(v_dot, UP)',
        "            self.play(FadeIn(v_dot), Write(v_lbl))",
        "",
        "        self.wait(2)",
    ]

    return "\n".join(script_lines)


def build_graph_scene(title: str, functions, x_range, y_range, show_axes=True, notes=None):
    title = escape_py_string(title)
    functions = functions or [{"expr": "x", "label": "y=x"}]
    notes = notes or []

    # Safe defaults
    x0, x1 = -6, 6
    y0, y1 = -6, 6
    try:
        if x_range and len(x_range) == 2:
            x0, x1 = float(x_range[0]), float(x_range[1])
        if y_range and len(y_range) == 2:
            y0, y1 = float(y_range[0]), float(y_range[1])
    except Exception:
        pass

    # Only 2 functions max
    functions = functions[:2]

    script_lines = [
        "from manim import *",
        "import numpy as np",
        "",
        "class GeneratedScene(Scene):",
        "    def construct(self):",
        f'        title = Text("{title}", font_size=52).to_edge(UP)',
        "        self.play(Write(title))",
        "",
    ]

    if show_axes:
        script_lines += [
            f"        axes = Axes(x_range=[{x0},{x1},1], y_range=[{y0},{y1},1], x_length=10, y_length=5, tips=False).shift(DOWN*0.5)",
            "        self.play(Create(axes))",
            "",
        ]
    else:
        script_lines += [
            "        axes = Axes(x_range=[-6,6,1], y_range=[-6,6,1], x_length=10, y_length=5, tips=False).shift(DOWN*0.5)",
        ]

    # We will support only simple expressions: "x", "x^2", "sin(x)", "cos(x)"
    # Avoid eval for security. Map known patterns.
    script_lines += [
        "        def expr_to_func(expr: str):",
        "            expr = expr.strip().lower()",
        "            if expr in ['x', 'y=x']:",
        "                return lambda x: x",
        "            if expr in ['x^2', 'x**2']:",
        "                return lambda x: x*x",
        "            if expr in ['sin(x)', 'sin']:",
        "                return lambda x: np.sin(x)",
        "            if expr in ['cos(x)', 'cos']:",
        "                return lambda x: np.cos(x)",
        "            if expr in ['-x']:",
        "                return lambda x: -x",
        "            # fallback",
        "            return lambda x: x",
        "",
    ]

    for i, fn in enumerate(functions):
        expr = escape_py_string(fn.get("expr", "x"))
        label = escape_py_string(fn.get("label", expr))
        script_lines += [
            f'        f{i} = expr_to_func("{expr}")',
            f"        g{i} = axes.plot(lambda x: f{i}(x), x_range=[{x0},{x1}], use_smoothing=True)",
            f"        self.play(Create(g{i}))",
            f'        lbl{i} = Text("{label}", font_size=24).to_edge(DOWN).shift(UP*0.4)',
            f"        self.play(Write(lbl{i}))",
        ]

    if notes:
        note_text = " | ".join([escape_py_string(str(n)) for n in notes[:2]])
        script_lines += [
            "",
            f'        note = Text("{note_text}", font_size=26).to_edge(DOWN)',
            "        self.play(Write(note))",
        ]

    script_lines.append("        self.wait(2)")
    return "\n".join(script_lines)


# -------------------------
# Main render logic
# -------------------------

def build_script_from_params(title: str, scene_params: dict):
    """
    scene_params shape:
    {
      sceneType: "...",
      title: "...",
      params: {...}
    }
    """
    stype = (scene_params.get("sceneType") or "").lower()
    params = scene_params.get("params") or {}

    # If title inside scene_params is better, use it
    sp_title = scene_params.get("title")
    if sp_title and isinstance(sp_title, str) and sp_title.strip():
        title = safe_title(sp_title)

    if stype == "text":
        content = params.get("content") or params.get("text") or title
        return build_text_scene(title, content)

    if stype == "list":
        items = params.get("items") or []
        return build_list_scene(title, items)

    if stype == "dfa":
        nodes = params.get("nodes", [])
        edges = params.get("edges", [])
        explanation = params.get("explanation", "")
        return build_dfa_scene(title, nodes, edges, explanation)

    if stype == "diagram":
        nodes = params.get("nodes", [])
        edges = params.get("edges", [])
        return build_diagram_scene(title, nodes, edges)

    if stype == "quadratic":
        a = params.get("a", 1)
        b = params.get("b", -3)
        c = params.get("c", -4)
        show_formula = params.get("showFormula", True)
        return build_quadratic_scene(title, a, b, c, show_formula=show_formula)

    if stype == "graph":
        functions = params.get("functions", [{"expr": "x", "label": "y=x"}])
        x_range = params.get("xRange", [-6, 6])
        y_range = params.get("yRange", [-6, 6])
        show_axes = params.get("showAxes", True)
        notes = params.get("notes", [])
        return build_graph_scene(title, functions, x_range, y_range, show_axes=show_axes, notes=notes)

    # DEFAULT FALLBACK:
    # Instead of triangle, fallback to a simple diagram
    # so ANY unknown prompt still looks "diagrammatic"
    fallback_nodes = [
        {"id": "topic", "label": title},
        {"id": "idea1", "label": "Key Idea 1"},
        {"id": "idea2", "label": "Key Idea 2"},
    ]
    fallback_edges = [
        {"from": "topic", "to": "idea1", "label": "relates to"},
        {"from": "topic", "to": "idea2", "label": "includes"},
    ]
    return build_diagram_scene(title, fallback_nodes, fallback_edges)


def render_job(job_file: Path, job: dict):
    job["status"] = "processing"
    write_job(job_file, job)

    workdir = job_file.with_suffix("")
    if workdir.exists():
        shutil.rmtree(workdir)
    workdir.mkdir()

    title = safe_title(job.get("prompt", "Manim"))
    scene_params = job.get("sceneParams") or {}

    script = build_script_from_params(title, scene_params)
    script_path = workdir / "scene.py"
    script_path.write_text(script)

    out_name = f"{job['jobId']}.mp4"
    out_path = OUTPUT_DIR / out_name

    try:
        cmd = [
            "manim",
            str(script_path),
            "GeneratedScene",
            "-ql",
            "--format",
            "mp4",
            "-o",
            str(out_path),
        ]
        print("Running:", " ".join(cmd))
        subprocess.run(cmd, check=True, cwd=workdir)

        job["status"] = "completed"

        # Optional S3 upload
        s3_bucket = os.environ.get("AWS_S3_BUCKET") or os.environ.get("AWS_BUCKET")
        if s3_bucket:
            s3_key = f"manim_videos/{out_name}"
            try:
                s3_client = boto3.client(
                    "s3",
                    aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
                    aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
                    region_name=os.environ.get("AWS_REGION"),
                )
                print(f"Uploading {out_path} to s3://{s3_bucket}/{s3_key}")
                s3_client.upload_file(
                    str(out_path),
                    s3_bucket,
                    s3_key,
                    ExtraArgs={"ACL": "public-read", "ContentType": "video/mp4"},
                )
                job["resultUrl"] = f"https://{s3_bucket}.s3.amazonaws.com/{s3_key}"
            except (BotoCoreError, ClientError) as e:
                job["status"] = "failed"
                job["error"] = f"S3 upload failed: {e}"
        else:
            job["resultUrl"] = f"/manim_videos/{out_name}"

    except subprocess.CalledProcessError as e:
        job["status"] = "failed"
        job["error"] = str(e)
    finally:
        job["processedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
        write_job(job_file, job)


def main():
    ensure_dirs()
    print("Manim worker started; polling", JOB_DIR)
    try:
        while True:
            job_file, job = pick_job()
            if job_file:
                print("Processing", job_file)
                render_job(job_file, job)
            else:
                time.sleep(2)
    except KeyboardInterrupt:
        print("Worker stopped")


if __name__ == "__main__":
    main()
