.PHONY: install run test build clean cluster

install:
	pip install -r requirements.txt

run:
	python main.py

cluster:
	python scripts/run_all.py

test:
	pytest -v

build:
	docker build -t loadsphere:latest .

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
