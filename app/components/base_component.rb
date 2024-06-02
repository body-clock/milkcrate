# frozen_string_literal: true

# Base component that accepts options that in the future could be converted to appropriate
# Bootstrap v5 classes and attributes. Options that are not converted to Bootstrap attributes are
# passed onto tag.public_send.
class BaseComponent < ViewComponent::Base
  def initialize(tag, **options)
    @tag = tag
    @options = options
  end

  def call
    tag.public_send(@tag, content, **@options)
  end
end
