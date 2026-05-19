class SellerMailer < ApplicationMailer
  def confirmation(waitlist)
    @waitlist = waitlist
    mail to: waitlist.email, subject: "Welcome to Milkcrate — we're reviewing your store"
  end

  def admin_notification(waitlist)
    @waitlist = waitlist
    mail to: Settings.mail.admin_email, subject: "New Milkcrate application: #{waitlist.name}"
  end
end
