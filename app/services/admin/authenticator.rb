class Admin::Authenticator
  Result = Struct.new(:admin, :status, keyword_init: true) do
    def not_found?; status == :not_found; end
    def locked?; status == :locked; end
    def invalid_password?; status == :invalid_password; end
    def success?; status == :authenticated; end
  end

  def call(email:, password:)
    admin = AdminUser.find_by(email: email.strip.downcase)
    return Result.new(status: :not_found) unless admin
    return Result.new(admin:, status: :locked) if admin.locked?

    unless admin.authenticate(password)
      admin.increment_failed_attempts!
      return Result.new(admin:, status: :invalid_password)
    end

    Result.new(admin:, status: :authenticated)
  end
end
