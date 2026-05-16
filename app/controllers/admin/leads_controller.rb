class Admin::LeadsController < Admin::BaseController
  layout "inertia_application"

  def index
    leads = Lead.by_score.newest_first
    leads = leads.by_status(params[:status]) if params[:status].present?
    leads = leads.scored_above(params[:min_score].to_f) if params[:min_score].present?

    render inertia: "admin/leads/index", props: Admin::LeadsPresenter.new(params).index_props(leads)
  end

  def show
    lead = Lead.find(params[:id])
    render inertia: "admin/leads/show", props: Admin::LeadsPresenter.new.show_props(lead)
  end

  def update
    lead = Lead.find(params[:id])

    if lead.update(lead_params)
      lead.update!(reviewed_at: Time.current) if lead.saved_change_to_status?
      redirect_to admin_leads_path, notice: "Lead updated"
    else
      redirect_to admin_leads_path, alert: lead.errors.full_messages.to_sentence
    end
  end

  def onboard
    lead = Lead.find(params[:id])

    if lead.onboarded?
      redirect_to admin_leads_path, alert: "Lead #{lead.discogs_username} is already onboarded"
      return
    end

    result = StoreOnboarding.call(discogs_username: lead.discogs_username)
    lead.update!(status: :onboarded, reviewed_at: Time.current)
    redirect_to admin_leads_path, notice: "Onboarding queued for #{result.store.name}"
  rescue StoreOnboarding::Error => e
    redirect_to admin_leads_path, alert: e.message
  end

  private

  def lead_params
    params.require(:lead).permit(:status, :notes)
  end
end
