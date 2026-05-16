class LeadDiscoveryPipelineJob < ApplicationJob
  queue_as :default

  MAX_LEADS_PER_RUN = 50  # safety cap for initial ramp-up

  def perform(seed_usernames: [])
    Rails.logger.info "[LeadDiscoveryPipelineJob] Starting lead discovery pipeline"

    # Stage 1: Discover sellers from Discogs and create/update Lead records.
    discovery_result = LeadDiscoveryService.call(seed_usernames: seed_usernames)
    total = discovery_result.leads_created + discovery_result.leads_updated
    Rails.logger.info "[LeadDiscoveryPipelineJob] Discovery: #{discovery_result.leads_created} created, #{discovery_result.leads_updated} updated, #{discovery_result.errors.size} errors"

    # Stage 2: Score pending leads that need scoring.
    scorer = LeadScorer.new

    leads_to_score = Lead.by_status(:pending)
                         .where("scored_at IS NULL OR updated_at > scored_at")
                         .limit(MAX_LEADS_PER_RUN)

    scored_count = 0
    leads_to_score.find_each do |lead|
      result = scorer.score(lead)
      lead.update!(score: result[:score], score_breakdown: result[:dimensions], scored_at: Time.current)
      scored_count += 1
    rescue StandardError => e
      Rails.logger.warn "[LeadDiscoveryPipelineJob] Scoring error for #{lead.discogs_username}: #{e.message}"
    end
    Rails.logger.info "[LeadDiscoveryPipelineJob] Scored #{scored_count} leads"

    # Stage 3: Check web presence for leads scored in this run.
    checker = LeadDiscovery::WebPresenceChecker.new
    web_checked_count = 0

    leads_for_web_check = Lead.by_status(:pending)
                              .where(web_presence: nil)
                              .where("scored_at IS NOT NULL")
                              .limit(MAX_LEADS_PER_RUN)

    leads_for_web_check.find_each do |lead|
      checker.check_and_store!(lead)
      web_checked_count += 1

      # Re-score after web check since presence penalty may apply.
      result = scorer.score(lead)
      lead.update!(score: result[:score], score_breakdown: result[:dimensions], scored_at: Time.current)
    rescue StandardError => e
      Rails.logger.warn "[LeadDiscoveryPipelineJob] Web check error for #{lead.discogs_username}: #{e.message}"
    end
    Rails.logger.info "[LeadDiscoveryPipelineJob] Web-checked #{web_checked_count} leads"

    Rails.logger.info "[LeadDiscoveryPipelineJob] Pipeline complete"
  end
end
