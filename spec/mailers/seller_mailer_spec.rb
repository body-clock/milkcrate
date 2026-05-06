require "rails_helper"

RSpec.describe SellerMailer, type: :mailer do
  describe "#confirmation" do
    let(:waitlist) { create(:waitlist, name: "Test Store", email: "store@example.com", discogs_username: "teststore") }
    let(:mail) { described_class.confirmation(waitlist) }

    it "renders the headers" do
      expect(mail.subject).to eq("Welcome to Milkcrate — we're reviewing your store")
      expect(mail.to).to eq([ "store@example.com" ])
      expect(mail.from).to eq([ "from@example.com" ])
    end

    it "renders the body with seller name" do
      expect(mail.text_part.body).to include("Test Store")
      expect(mail.html_part.body).to include("Test Store")
    end

    it "includes the Discogs username" do
      expect(mail.text_part.body).to include("teststore")
      expect(mail.html_part.body).to include("teststore")
    end
  end
end
