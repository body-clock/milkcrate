class Admin::Authenticator
  Result = Struct.new(:admin, :status, keyword_init: true) do
    def not_found?; status == :not_found; end
    def locked?; status == :locked; end
    def invalid_password?; status == :invalid_password; end
    def success?; status == :authenticated; end
  end

  def call(email:, password:)
    admin = find_admin(email)
    return Result.new(status: :not_found) unless admin
    return Result.new(admin:, status: :locked) if admin.locked?
    return invalid_password_result(admin) unless admin.authenticate(password)

    Result.new(admin:, status: :authenticated)
  end

  private

  def find_admin(email)
    AdminUser.find_by(email: email.strip.downcase)
  end

  def invalid_password_result(admin)
    admin.increment_failed_attempts!
    Result.new(admin:, status: :invalid_password)
  end
end
