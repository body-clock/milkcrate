module ApplicationHelper
  def sanitize_url(url)
    return "#" if url.blank?
    uri = URI.parse(url)
    uri.scheme.in?(%w[http https]) ? url : "#"
  rescue URI::InvalidURIError
    "#"
  end
end
