require "json"
require "rack"
require "fileutils"

crate_dir = ENV.fetch("CRATE_DIR")
abort "Crate directory not found: #{crate_dir}" unless Dir.exist?(crate_dir)

save_handler = ->(env) {
  req = Rack::Request.new(env)
  body = JSON.parse(req.body.read)
  File.write(File.join(crate_dir, "results.json"), JSON.pretty_generate(body))
  [ 200, { "content-type" => "application/json" }, [ JSON.generate({ ok: true }) ] ]
}

static = Rack::Static.new(
  ->(_) { [ 404, {}, [] ] },
  root: crate_dir,
  urls: [ "" ],
  index: "label.html"
)

app = ->(env) {
  if env["REQUEST_METHOD"] == "POST" && env["PATH_INFO"] == "/save"
    save_handler.call(env)
  else
    static.call(env)
  end
}

run app
