"""
Mock Manim worker for local development and CI.

This does NOT require Manim or Docker. It polls `manim_jobs/` for queued jobs,
waits a short time, writes a dummy mp4 file under `public/manim_videos/`, and
updates the job JSON with a `resultUrl` so the frontend and e2e tests can proceed.
"""
import time
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
JOB_DIR = ROOT / 'manim_jobs'
OUTPUT_DIR = ROOT / 'public' / 'manim_videos'


def ensure_dirs():
    JOB_DIR.mkdir(exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def pick_job():
    for p in JOB_DIR.glob('manim-*.json'):
        try:
            job = json.loads(p.read_text())
            if job.get('status') == 'queued':
                return p, job
        except Exception:
            continue
    return None, None


def write_job(p, job):
    p.write_text(json.dumps(job, indent=2))


def render_job(job_file: Path, job: dict):
    job['status'] = 'processing'
    write_job(job_file, job)
    time.sleep(2)  # simulate work
    out_name = f"{job['jobId']}.mp4"
    out_path = OUTPUT_DIR / out_name
    # create an empty file to simulate an mp4
    out_path.write_bytes(b"")
    job['status'] = 'completed'
    job['resultUrl'] = f"/manim_videos/{out_name}"
    job['processedAt'] = time.strftime('%Y-%m-%dT%H:%M:%SZ')
    write_job(job_file, job)


def main():
    ensure_dirs()
    print('Mock manim worker started; polling', JOB_DIR)
    try:
        while True:
            job_file, job = pick_job()
            if job_file:
                print('Processing', job_file)
                render_job(job_file, job)
            else:
                time.sleep(1)
    except KeyboardInterrupt:
        print('Mock worker stopped')


if __name__ == '__main__':
    main()
