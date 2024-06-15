# frozen_string_literal: true

# Record Card
class RecordComponent < ViewComponent::Base
  attr_accessor :record

  def initialize(record:)
    @record = record
  end
end
