FactoryBot.define do
  factory :admin_user do
    sequence(:email) { |n| "admin#{n}@milkcrate.fm" }
    password { "test-admin-password-123" }
    password_confirmation { "test-admin-password-123" }
    failed_login_attempts { 0 }
    locked_at { nil }

    trait :locked do
      locked_at { 1.minute.ago }
      failed_login_attempts { AdminUser::MAX_ATTEMPTS }
    end

    trait :with_totp do
      after(:create) do |admin|
        admin.generate_totp_secret!
        admin.admin_totp.update!(enabled: true, last_used_at: nil)
      end
    end
  end
end
