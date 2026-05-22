require "rails_helper"

RSpec.describe WaitlistRegistration do
  let(:valid_params) do
    ActionController::Parameters.new(
      waitlist: { name: "New Store", discogs_username: "new-store", email: "store@example.com", inventory_size: "500_2000" }
    ).require(:waitlist).permit(:name, :discogs_username, :email, :inventory_size, :notes)
  end

  describe "#call" do
    it "creates a waitlist entry and sends emails on success" do
      result = described_class.new(valid_params).call

      expect(result.success).to be(true)
      expect(result.waitlist).to be_persisted
      expect(result.waitlist.name).to eq("New Store")
    end

    it "returns errors for invalid params" do
      params = ActionController::Parameters.new(waitlist: { name: "" }).require(:waitlist).permit(:name, :discogs_username, :email, :inventory_size, :notes)
      result = described_class.new(params).call

      expect(result.success).to be(false)
      expect(result.errors).to be_present
    end

    it "returns turnstile error when verification fails" do
      params = valid_params
      fake_verifier = class_double(TurnstileVerifier, enabled?: true)
      allow(fake_verifier).to receive(:verify).and_return(false)

      result = described_class.new(params, turnstile_verifier: fake_verifier, turnstile_token: "bad-token", remote_ip: "127.0.0.1").call

      expect(result.success).to be(false)
      expect(result.errors[:turnstile]).to be_present
    end

    it "succeeds when turnstile verification passes" do
      params = valid_params
      fake_verifier = class_double(TurnstileVerifier, enabled?: true)
      allow(fake_verifier).to receive(:verify).and_return(true)

      result = described_class.new(params, turnstile_verifier: fake_verifier, turnstile_token: "good-token", remote_ip: "127.0.0.1").call

      expect(result.success).to be(true)
      expect(result.waitlist).to be_persisted
    end
  end
end
