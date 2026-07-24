api-install:
	cd apps/api && python -m pip install -r requirements.txt

api-seed:
	cd apps/api && python scripts/seed.py

api-test:
	cd apps/api && pytest -q

api-dev:
	cd apps/api && uvicorn app.main:app --reload --port 8000

prototype:
	cd prototype && python -m http.server 4173

web-install:
	cd apps/web && npm install

web-dev:
	cd apps/web && npm run dev

api-smoke-m03:
	python scripts/smoke_m03.py

model-benchmark:
	cd apps/api && python scripts/run_model_benchmark.py --suite local-model --max-cases 4

supabase-sync:
	curl -X POST -H "X-Admin-Token: $$CAREER_COPILOT_ADMIN_TOKEN" http://127.0.0.1:8000/api/supabase/sync

frontend-validate:
	node scripts/validate_frontend.mjs apps/web
