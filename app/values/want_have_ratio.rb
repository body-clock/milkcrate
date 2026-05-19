class WantHaveRatio < Data.define(:want, :have)
  RATIO_HIGH = 2.0
  RATIO_LOW  = 0.5
  MIN_HAVE   = 10
  LOG_CAP    = 4.0

  def ratio
    h = have.to_i
    return 0.0 if h <= 0
    want.to_i.to_f / h
  end

  def high?
    have.to_i >= MIN_HAVE && ratio >= RATIO_HIGH
  end

  def low?
    have.to_i >= MIN_HAVE && ratio <= RATIO_LOW
  end

  def log_base_score
    total = want.to_i + have.to_i
    return 0.0 if total <= 0
    Math.log10(total).clamp(0, LOG_CAP)
  end

  def total
    want.to_i + have.to_i
  end
end
