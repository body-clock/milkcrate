class AdminTotp < ApplicationRecord
  belongs_to :admin, class_name: "AdminUser", foreign_key: :admin_id
end
