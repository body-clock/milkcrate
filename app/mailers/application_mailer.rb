class ApplicationMailer < ActionMailer::Base
  default from: proc { Settings.mail.from }
  layout "mailer"
end
