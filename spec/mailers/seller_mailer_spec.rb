require "rails_helper"

RSpec.describe SellerMailer, type: :mailer do
  describe "#confirmation" do
    let(:waitlist) { create(:waitlist, name: "Test Store", email: "store@example.com", discogs_username: "teststore") }
    let(:mail) { described_class.confirmation(waitlist) }

    it "renders the headers" do
      expect(mail.subject).to eq("Welcome to Milkcrate — we're reviewing your store")
      expect(mail.to).to eq([ "store@example.com" ])
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

  describe "#admin_notification" do
    let(:waitlist) { create(:waitlist, name: "Test Store", email: "store@example.com", discogs_username: "teststore", inventory_size: "2000_10000", notes: "Specializes in jazz.") }
    let(:mail) { described_class.admin_notification(waitlist) }

    it "sends to the configured admin email" do
      expect(mail.to).to eq([ Settings.admin_email ])
    end

    it "includes the store name in the subject" do
      expect(mail.subject).to eq("New Milkcrate application: Test Store")
    end

    it "renders all waitlist fields in the body" do
      expect(mail.text_part.body).to include("Test Store")
      expect(mail.text_part.body).to include("store@example.com")
      expect(mail.text_part.body).to include("teststore")
      expect(mail.text_part.body).to include("2000_10000")
      expect(mail.text_part.body).to include("Specializes in jazz.")
    end
  end
end
