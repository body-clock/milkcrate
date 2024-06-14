# frozen_string_literal: true

# Record Card
class MarksComponent < ViewComponent::Base
  attr_accessor :marks

  def initialize(marks:)
    @marks = marks
  end
end
