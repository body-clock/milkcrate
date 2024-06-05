# frozen_string_literal: true

# Clobber assets after running system tests to ensure development environment
# dynamically generates assets
RSpec.configure do |config|
  config.after(:suite) do
    examples = RSpec.world.filtered_examples.values.flatten
    has_no_system_tests = examples.none? { |example| example.metadata[:type] == :system }

    if has_no_system_tests
      $stdout.puts "\n🚀️️  No system test selected. Skip clobbering assets.\n"
      next
    end

    $stdout.puts "\n🔨  Clobbering assets.\n"

    start = Time.current
    begin
      require 'rake'
      Rails.application.load_tasks
      # Rake::Task['assets:clobber'].invoke('-q', '-s')
      system('bundle exec rake assets:clobber -q -s')
    ensure
      $stdout.puts "Finished in #{(Time.current - start).round(2)} seconds"
    end
  end
end
