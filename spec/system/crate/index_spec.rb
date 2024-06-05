# frozen_string_literal: true

require 'system_helper'

describe 'crate index page' do
  let(:user) { build(:user) }

  before do
    sign_in(user)
    visit crates_path
  end

  it 'renders the index page'
end
