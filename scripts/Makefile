# SafeRail.AI Backend Makefile

PYTHON := $(shell command -v python3 2> /dev/null || command -v python 2> /dev/null)
VENV := venv
BIN := $(VENV)/bin

ifeq ($(OS),Windows_NT)
	BIN := $(VENV)/Scripts
	PYTHON_VENV := $(BIN)/python.exe
else
	PYTHON_VENV := $(BIN)/python
endif

.PHONY: all setup run clean

all: setup run

setup: $(VENV)/.setup_done

$(VENV)/.setup_done: requirements.txt setup.py
	@echo "[INFO] Running environment setup..."
	@$(PYTHON) setup.py
	@touch $(VENV)/.setup_done

run: setup
	@echo "[INFO] Starting SafeRail Backend..."
	@if [ -f "$(PYTHON_VENV)" ]; then \
		echo "[INFO] Starting Cloudflare Tunnel..."; \
		(cloudflared tunnel --config ".cloudflared/config.yml" run saferail-api &); \
		$(PYTHON_VENV) server.py; \
	else \
		echo "[ERROR] Virtual environment not found. Setup may have failed."; \
		exit 1; \
	fi

clean:
	rm -rf $(VENV)
	rm -f Modelfile
