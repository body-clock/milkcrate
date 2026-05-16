require "rails_helper"

RSpec.describe Admin::LeadsPresenter do
  subject(:presenter) { described_class.new(params) }

  let(:params) { {} }

  describe "#index_props" do
    let!(:leads) { create_list(:lead, 3) }

    it "returns a hash with leads array" do
      result = presenter.index_props(Lead.all)
      expect(result).to have_key(:leads)
      expect(result[:leads].size).to eq(3)
    end

    it "includes pagination info" do
      result = presenter.index_props(Lead.all)
      expect(result).to have_key(:pagination)
      expect(result[:pagination]).to have_key(:current_page)
      expect(result[:pagination]).to have_key(:total_pages)
    end

    it "includes filters" do
      result = presenter.index_props(Lead.all)
      expect(result).to have_key(:filters)
    end

    it "serializes each lead with summary fields" do
      result = presenter.index_props(Lead.all)
      serialized = result[:leads].first
      expect(serialized).to have_key(:discogs_username)
      expect(serialized).to have_key(:inventory_size)
      expect(serialized).to have_key(:score)
      expect(serialized).to have_key(:status)
      expect(serialized).not_to have_key(:score_breakdown)
    end
  end

  describe "#show_props" do
    let(:lead) { create(:lead, score_breakdown: { "inventory_size" => 100, "vinyl_share" => 80, "genre_depth" => 60, "presence_penalty" => 0 }) }

    it "returns a hash with lead detail" do
      result = presenter.show_props(lead)
      expect(result).to have_key(:lead)
    end

    it "includes score_breakdown" do
      result = presenter.show_props(lead)
      expect(result[:lead][:score_breakdown]).to have_key(:inventory_size)
      expect(result[:lead][:score_breakdown]).to have_key(:vinyl_share)
    end

    it "includes web_presence" do
      result = presenter.show_props(lead)
      expect(result[:lead]).to have_key(:web_presence)
    end

    it "handles nil score_breakdown" do
      lead.update!(score_breakdown: nil)
      result = presenter.show_props(lead)
      expect(result[:lead][:score_breakdown]).to be_nil
    end
  end
end
