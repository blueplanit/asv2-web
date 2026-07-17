import Script from "next/script";

const mailerLiteStyles = `
  @import url("https://assets.mlcdn.com/fonts.css?version=1783937");

  #mlb2-43150803.ml-form-embedContainer {
    box-sizing: border-box;
    display: table;
    margin: 0 auto;
    position: static;
    width: 100%;
  }
  #mlb2-43150803.ml-form-embedContainer .ml-form-embedWrapper {
    background: #E2E8F0;
    border-radius: 4px;
    box-sizing: border-box;
    display: inline-block;
    margin: 0;
    max-width: 400px;
    padding: 0;
    position: relative;
    width: 100%;
  }
  #mlb2-43150803.ml-form-embedContainer .ml-form-align-center {
    text-align: center;
  }
  #mlb2-43150803.ml-form-embedContainer .ml-form-embedBody {
    padding: 20px 20px 0;
  }
  #mlb2-43150803.ml-form-embedContainer .ml-form-embedContent {
    margin: 0 0 20px;
    text-align: left;
  }
  #mlb2-43150803.ml-form-embedContainer .ml-form-embedContent h4,
  #mlb2-43150803.ml-form-embedContainer .ml-form-successContent h4 {
    color: #0F172A;
    font-family: 'Open Sans', Arial, sans-serif;
    font-size: 26px;
    font-weight: 400;
    line-height: 1.2;
    margin: 0 0 10px;
  }
  #mlb2-43150803.ml-form-embedContainer .ml-form-embedContent p,
  #mlb2-43150803.ml-form-embedContainer .ml-form-successContent p {
    color: #475569;
    font-family: 'Open Sans', Arial, sans-serif;
    font-size: 16px;
    font-weight: 400;
    line-height: 22px;
    margin: 0;
    text-align: left;
  }
  #mlb2-43150803.ml-form-embedContainer .ml-form-embedBody form {
    margin: 0;
    width: 100%;
  }
  #mlb2-43150803.ml-form-embedContainer .ml-form-fieldRow {
    margin: 0 0 10px;
    width: 100%;
  }
  #mlb2-43150803.ml-form-embedContainer .ml-form-fieldRow input {
    background: #FFFFFF !important;
    border: 1px solid #CCCCCC !important;
    border-radius: 4px !important;
    box-sizing: border-box !important;
    color: #333333 !important;
    font-family: 'Open Sans', Arial, sans-serif;
    font-size: 14px !important;
    line-height: 21px !important;
    padding: 10px !important;
    width: 100% !important;
  }
  #mlb2-43150803.ml-form-embedContainer .ml-form-embedSubmit {
    margin: 0 0 20px;
    width: 100%;
  }
  #mlb2-43150803.ml-form-embedContainer .ml-form-embedSubmit button {
    background: #4F46E5 !important;
    border: 0 !important;
    border-radius: 4px !important;
    box-sizing: border-box !important;
    color: #FFFFFF !important;
    cursor: pointer;
    font-family: 'Open Sans', Arial, sans-serif !important;
    font-size: 14px !important;
    font-weight: 700 !important;
    line-height: 21px !important;
    padding: 10px !important;
    width: 100% !important;
  }
  #mlb2-43150803.ml-form-embedContainer .ml-form-embedSubmit button:hover {
    background: #333333 !important;
  }
  #mlb2-43150803.ml-form-embedContainer .ml-form-embedSubmit button.loading {
    display: none;
  }
  #mlb2-43150803.ml-form-embedContainer .sr-only {
    border: 0;
    clip: rect(0, 0, 0, 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
  }
  #mlb2-43150803.ml-form-embedContainer .ml-error input {
    border-color: red !important;
  }
  #mlb2-43150803.ml-form-embedContainer .ml-form-successBody {
    padding: 20px;
  }
  @media only screen and (max-width: 400px) {
    #mlb2-43150803.ml-form-embedContainer .ml-form-embedWrapper {
      width: 100%;
    }
  }
`;

export function MailerLiteCommissionForm() {
    return (
        <section className="border-y border-slate-200 bg-slate-50/80">
            <div className="mx-auto max-w-6xl px-6 py-12 sm:py-14">
                <div id="mlb2-43150803" className="ml-form-embedContainer ml-subscribe-form ml-subscribe-form-43150803">
                    <style dangerouslySetInnerHTML={{ __html: mailerLiteStyles }} />
                    <div className="ml-form-align-center">
                        <div className="ml-form-embedWrapper embedForm">
                            <div className="ml-form-embedBody ml-form-embedBodyDefault row-form">
                                <div className="ml-form-embedContent">
                                    <h4>Free Stripe Commission Tracker</h4>
                                    <p>
                                        A Google Sheet that calculates rep commissions and partner revenue share from Stripe — net of fees and refunds. Enter your email and it&apos;s yours.
                                    </p>
                                </div>
                                <form
                                    className="ml-block-form"
                                    action="https://assets.mailerlite.com/jsonp/2476794/forms/191558050637677901/subscribe"
                                    data-code=""
                                    method="post"
                                    target="_blank"
                                >
                                    <div className="ml-form-formContent">
                                        <div className="ml-form-fieldRow ml-last-item">
                                            <div className="ml-field-group ml-field-email ml-validate-email ml-validate-required">
                                                <label className="sr-only" htmlFor="mailerLiteCommissionEmail">
                                                    Email
                                                </label>
                                                <input
                                                    id="mailerLiteCommissionEmail"
                                                    aria-label="email"
                                                    aria-required="true"
                                                    type="email"
                                                    className="form-control"
                                                    data-inputmask=""
                                                    name="fields[email]"
                                                    placeholder="Email"
                                                    autoComplete="email"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <input type="hidden" name="ml-submit" value="1" />
                                    <div className="ml-form-embedSubmit">
                                        <button type="submit" className="primary">
                                            Send me the template
                                        </button>
                                        <button disabled style={{ display: "none" }} type="button" className="loading">
                                            <span className="ml-form-embedSubmitLoad sr-only">Loading...</span>
                                        </button>
                                    </div>
                                    <input type="hidden" name="anticsrf" value="true" />
                                </form>
                            </div>
                            <div className="ml-form-successBody row-success" style={{ display: "none" }}>
                                <div className="ml-form-successContent">
                                    <h4>Thank you!</h4>
                                    <p>You have successfully joined our subscriber list.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Script id="mailerlite-success-43150803" strategy="afterInteractive">
                {`function ml_webform_success_43150803() {
  try {
    window.top.location.href = "https://docs.google.com/spreadsheets/d/1Cb4xUlqlWGOmVqTnU_19gykJs6Zy-GYlfe4Z63Xxl5I/view?usp=sharing";
  } catch (e) {
    window.location.href = "https://docs.google.com/spreadsheets/d/1Cb4xUlqlWGOmVqTnU_19gykJs6Zy-GYlfe4Z63Xxl5I/view?usp=sharing";
  }
}`}
            </Script>
            <Script
                src="https://groot.mailerlite.com/js/w/webforms.min.js?v83147fa8ce2d95cb73ece7f28b469519"
                strategy="afterInteractive"
            />
            <Script id="mailerlite-takel-43150803" strategy="afterInteractive">
                {`fetch("https://assets.mailerlite.com/jsonp/2476794/forms/191558050637677901/takel")`}
            </Script>
        </section>
    );
}
