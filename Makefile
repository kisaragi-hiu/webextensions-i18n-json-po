dist: dist/index.js
dist/index.js: $(wildcard src/*.ts) bun.lock
	mkdir -p $(@D)
	bun build src/index.ts --target=node --outfile=dist/index.js --minify \
		--define "process.env.NODE_ENV='production'"

bun.lock: package.json
	bun install
	touch "$@"

.PHONY: all build clean dev format lint release test

all: dist

build: dist

clean:
	git clean -Xfd

dev:
	bun build src/index.ts --target=node --outfile=dist/index.js --watch

format:
	bunx biome format --write src/

lint:
	bunx biome lint src/
	bunx tsc

release:
	bunx bumpp

test:
	bun test

test-cov:
	bun test --coverage --coverage-reporter lcov
