module.exports.make = ({
  inviterDisplayName,
  companyDisplayName,
  invitationLink
}) => {
  return { 
    subject: `${inviterDisplayName} invited you to Xyla!`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
<title>Xyla | Invitation</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<style type="text/css">
    /* CLIENT-SPECIFIC STYLES */
    #outlook a{padding:0;} /* Force Outlook to provide a "view in browser" message */
    .ReadMsgBody{width:100%;} .ExternalClass{width:100%;} /* Force Hotmail to display emails at full width */
    .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {line-height: 100%;} /* Force Hotmail to display normal line spacing */
    body, table, td, a{-webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;} /* Prevent WebKit and Windows mobile changing default text sizes */
    table, td{mso-table-lspace:0pt; mso-table-rspace:0pt;} /* Remove spacing between tables in Outlook 2007 and up */
    img{-ms-interpolation-mode:bicubic;} /* Allow smoother rendering of resized image in Internet Explorer */
    /* RESET STYLES */
    body{margin:0; padding:0;}
    img{border:0; height:auto; line-height:100%; outline:none; text-decoration:none;}
    table{border-collapse:collapse !important;}
    body{height:100% !important; margin:0; padding:0; width:100% !important;}
    /* MOBILE STYLES */
    @media screen and (max-width: 525px) {
        /* ALLOWS FOR FLUID TABLES */
        table[class="wrapper"]{
          width:100% !important;
        }
        /* ADJUSTS LAYOUT OF LOGO IMAGE */
        td[class="logo"]{
          text-align: left;
          padding: 20px 0 20px 0 !important;
        }
        td[class="logo"] img{
          margin:0 auto!important;
        }
        /* USE THESE CLASSES TO HIDE CONTENT ON MOBILE */
        td[class="mobile-hide"]{
          display:none;}
        img[class="mobile-hide"]{
          display: none !important;
        }
        img[class="img-max"]{
          max-width: 100% !important;
          height:auto !important;
        }
        /* FULL-WIDTH TABLES */
        table[class="responsive-table"]{
          width:100%!important;
        }
        /* UTILITY CLASSES FOR ADJUSTING PADDING ON MOBILE */
        td[class="padding"]{
          padding: 10px 5% 15px 5% !important;
        }
        td[class="padding-copy"]{
          padding: 10px 5% 10px 5% !important;
          text-align: center;
        }
        td[class="padding-meta"]{
          padding: 30px 5% 0px 5% !important;
          text-align: center;
        }
        td[class="no-pad"]{
          padding: 0 0 20px 0 !important;
        }
        td[class="no-padding"]{
          padding: 0 !important;
        }
        td[class="section-padding"]{
          padding: 50px 15px 50px 15px !important;
        }
        td[class="section-padding-bottom-image"]{
          padding: 50px 15px 0 15px !important;
        }
        /* ADJUST BUTTONS ON MOBILE */
        td[class="mobile-wrapper"]{
            padding: 10px 5% 15px 5% !important;
        }
        table[class="mobile-button-container"]{
            margin:0 auto;
            width:100% !important;
        }
        a[class="mobile-button"]{
            width:80% !important;
            padding: 15px !important;
            border: 0 !important;
            font-size: 16px !important;
        }
    }
</style>
</head>
<body style="margin: 0; padding: 0;">

<!-- ONE COLUMN SECTION -->
<table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr bgcolor="#f8f9fa">
        <td align="center" style="padding: 10px 15px 0px 15px;">
            <table border="0" cellpadding="0" cellspacing="0" width="500" class="responsive-table">
                <tr>
                    <td>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                                <td>
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td align="center" style="font-size: 25px; line-height: 20px; font-family: Monaco, monospace; color: #ff001e; padding-top: 30px;">Welcome!</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr bgcolor="#ffffff">
        <td align="center" style="padding: 20px 35px 40px 35px;" class="section-padding">
            <table border="0" cellpadding="0" cellspacing="0" width="400" class="responsive-table">
                <tr>
                    <td>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                                <td>
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0" class="mobile-button-container">
                                        <!-- COPY -->
                                        <tr>
                                            <td align="left" style="padding: 20px 0 0 0; font-size: 16px; line-height: 25px; font-family: Trebuchet MS, Arial, sans-serif; color: #666666;" class="padding-copy">
                                              You have been invited to join ${companyDisplayName}'s marketing analytics environment in Xyla. If you have any trouble please contact ${inviterDisplayName} directly.
                                            </td>
                                        </tr>
                                        <!-- BULLETPROOF BUTTON -->
                                        <tr>
                                            <td align="center" style="padding: 25px 0 0 0;" class="padding-copy">
                                                <table border="0" cellspacing="0" cellpadding="0" class="responsive-table">
                                                    <tr>
                                                      <td align="center"><a href="${invitationLink}" target="_blank" style="font-size: 16px; font-family: Trebuchet MS, Arial, sans-serif; font-weight: normal; color: #ffffff; text-decoration: none; background-color: #ff001e; border-top: 15px solid #ff001e; border-bottom: 15px solid #ff001e; border-left: 25px solid #ff001e; border-right: 25px solid #ff001e; border-radius: 5px; -webkit-border-radius: 5px; -moz-border-radius: 5px; display: inline-block;" class="mobile-button">CREATE YOUR ACCOUNT &nbsp;&nbsp;&rarr;</a></td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr bgcolor="#f8f9fa">
        <td align="center" style="padding: 10px 15px 0px 15px;">
            <table border="0" cellpadding="0" cellspacing="0" width="500" class="responsive-table">
                <tr>
                    <td>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                                <td>
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td align="center" style="font-size: 25px; line-height: 20px; font-family: Monaco, monospace; color: #ff001e;">
                                                <a href="https://hello.xyla.io" target="_blank">
                                                    <img src="https://hello.xyla.io/assets/xyla_logo_with_text.png" width="100" height="30" border="0" alt="Xyla" style="display: block; padding: 0; color: #666666; text-decoration: none; font-family: Helvetica, arial, sans-serif; font-size: 16px; width: 100px; height: 30px; margin: 0 auto;" class="img-max"></a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr bgcolor="#f8f9fa">
        <td align="center" style="padding: 10px 15px 0px 15px;">
            <table border="0" cellpadding="0" cellspacing="0" width="500" class="responsive-table">
                <tr>
                    <td>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                                <td>
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td align="center" valign="middle" style="font-size: 10px; line-height: 14px; font-family: Trebuchet MS, Arial, sans-serif; color:#b5b5b5;">
                                                <span style="color:#b5b5b5;">Copyright © 2019 Xyla, Inc.</span><br>
                                                <span style="color:#b5b5b5;">301 W 4th Street, Suite 440, Royal Oak, MI 48067</span>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
`,
  };
};
