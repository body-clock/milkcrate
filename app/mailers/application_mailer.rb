class ApplicationMailer < ActionMailer::Base
  default from: proc { Settings.mail_from }
  layout "mailer"
end
