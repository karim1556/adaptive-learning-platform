# Manim Worker (prototype)

This is a simple prototype worker that processes job files placed in the repository `manim_jobs` directory and renders a small Manim scene into `public/manim_videos`.

WARNING: This is a development prototype. It intentionally avoids executing arbitrary user-provided Python code. Do NOT use this in production without sandboxing, strict validation, and resource limits.

Local quickstart:

1. Ensure you have Python 3.11 and `manim` installed. You can use the provided Dockerfile to build an image.

Build and run with Docker (recommended for reproducibility):

```bash
cd scripts/manim_worker
docker build -t manim-worker .
# Run worker attaching repository root so it can access manim_jobs and public/
docker run --rm -v $(pwd)/../../:/workspace -w /workspace manim-worker python scripts/manim_worker/render_worker.py
```

2. In another terminal, create a job by POSTing to the API route:

```bash
curl -X POST http://localhost:3000/api/manim/generate -H 'Content-Type: application/json' \
  -d '{"prompt":"Show a square and a title about similarity","quality":"low"}'
```

3. The job will appear as a JSON file in `manim_jobs/`. When the worker completes it will write `resultUrl` into the JSON and place the rendered mp4 into `public/manim_videos/`.

S3 upload (optional):

If you want the worker to upload rendered videos to S3, set the following environment variables when running the worker (Docker or local):

- `AWS_S3_BUCKET` or `AWS_BUCKET` — the target S3 bucket name
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` — credentials with PutObject permission
- `AWS_REGION` — optional region for the S3 bucket

The worker will upload the generated mp4 to `manim_videos/<jobId>.mp4` and set `resultUrl` to `https://<bucket>.s3.amazonaws.com/manim_videos/<jobId>.mp4` in the job JSON.

Example (Docker) with env vars:

```bash
docker run --rm \
  -e AWS_ACCESS_KEY_ID=AKIA... \
  -e AWS_SECRET_ACCESS_KEY=... \
  -e AWS_S3_BUCKET=my-bucket \
  -v $(pwd)/../../:/workspace \
  -w /workspace manim-worker python scripts/manim_worker/render_worker.py
```

Developer test (end-to-end):

1. Start the Next dev server:

```bash
npm run dev
```

2. In another terminal, build and run the worker (or run locally with your Python env):

```bash
npm run manim:worker:docker
# then run the image (see env vars above if you want S3 uploads)
```

3. Run the e2e test to create a job and poll until completion:

```bash
npm run manim:e2e -- "Explain the Pythagorean theorem with a triangle"
```


Next steps (recommended):
- Add AST-based sanitization or restrict to templated code generation.
- Run the worker inside a container with no network, resource limits, and a non-root user.
- Replace local filesystem storage with cloud object storage for production.

Sandboxing & security notes:

- Always run the worker in an isolated environment (container or VM) with no network access and a non-root user.
- Apply CPU, memory, and execution time limits. For Docker use `--cpus` and `--memory`, and run the renderer under a watchdog timer.
- Use strict input validation and AST-based checks if you plan to accept generated Python code. Prefer templated scene generation rather than executing arbitrary code.
- For production-scale systems, implement per-user quotas in a centralized store (Redis) and move the job queue off the filesystem to a managed queue (SQS, Cloud Tasks).
- Consider using a separate rendering service and signed upload URLs to avoid exposing cloud credentials to the worker host.

