module ApplicationHelper
  def sanitize_url(url)
    return "#" if url.blank?
    uri = URI.parse(url)
    uri.scheme.in?(%w[http https]) ? url : "#"
  rescue URI::InvalidURIError
    "#"
  end

  def canonical_link
    url = @page_seo&.dig(:canonical_url) || request.path
    tag.link(rel: "canonical", href: "#{request.base_url}#{url}")
  end

  def store_url(slug)
    "#{request.base_url}/#{slug}"
  end
end
