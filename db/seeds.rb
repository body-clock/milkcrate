# Load all seed files from db/seeds/
Dir[Rails.root.join("db/seeds/*.rb")].sort.each { |f| load f }
