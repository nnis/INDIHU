import React from "react";
import { withHandlers } from "recompose";
import ReCAPTCHA from "react-google-recaptcha";

const Captcha = ({ meta: { touched, error }, changeCaptcha }) =>
  <div>
    <ReCAPTCHA
      className="g-recaptcha"
      sitekey="6LfqvDQUAAAAACR8LVHfmAjw5TWRE-yth4ZM4No-"
      onChange={changeCaptcha}
    />
    {touched &&
      error &&
      <span className="invalid">
        {error}
      </span>}
  </div>;

export default withHandlers({
  changeCaptcha: ({ changeValue, input }) => value => {
    changeValue(input.name, value);
  }
})(Captcha);
