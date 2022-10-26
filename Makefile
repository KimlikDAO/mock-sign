build/sign.js: sign.js lib/util/cf-worker.js lib/tckt/TCKTBilgileri.js lib/api/edevletApi.js
	mkdir -p build
	yarn google-closure-compiler -W VERBOSE -O ADVANCED --charset UTF-8 \
                             --env BROWSER \
                             --assume_function_wrapper \
                             --js $^ \
                             --checks_only
	yarn uglifyjs $< -m -o $@

clean:
	rm -rf build

cf-deployment: build/sign.js
	yarn wrangler publish
