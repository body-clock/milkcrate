# frozen_string_literal: true

module Breadcrumbs
  # Component to create breadcrumbs.
  class BreadcrumbsComponent < ViewComponent::Base
    renders_many :breadcrumbs, BreadcrumbComponent

    def initialize(**options)
      @options = options

      @options[:class] = Array.wrap(@options[:class]).append('mb-3 bg-light text-dark rounded')
    end

    def render?
      breadcrumbs.any?
    end

    def call
      render(BaseComponent.new(:nav, 'aria-label': 'breadcrumb', **@options)) do
        tag.ol(class: 'breadcrumb p-2') { safe_join(breadcrumbs) }
      end
    end
  end
end
