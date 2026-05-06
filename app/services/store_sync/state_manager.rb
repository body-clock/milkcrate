module StoreSync
  class StateManager
    def self.start!(store)
      store.update!(sync_status: "syncing")
    end

    def self.succeed!(store, attributes = {})
      store.update!(
        {
          sync_status: "idle",
          last_sync_error: nil,
          last_sync_error_at: nil
        }.merge(attributes)
      )
    end

    def self.fail!(store, error)
      store.update!(
        sync_status: "failed",
        last_sync_error: summarized_error(error),
        last_sync_error_at: Time.current
      )
    end

    def self.summarized_error(error)
      summary = "#{error.class}: #{error.message}"
      backtrace = Array(error.backtrace).first(8)
      ([summary] + backtrace).join("\n")
    end
    private_class_method :summarized_error
  end
end
