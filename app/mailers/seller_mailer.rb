class SellerMailer < ApplicationMailer
  def confirmation(waitlist)
    @waitlist = waitlist
    mail to: waitlist.email, subject: "Welcome to Milkcrate — we're reviewing your store"
  end
end
