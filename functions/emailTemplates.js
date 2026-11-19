/**
 * Linker X Brand Verification Email Templates
 * Compatible with Naver Mail, Gmail (Web/Mobile), Outlook, Apple Mail
 */

export function generateVerificationEmailHtml({ link, email }) {
  // Ensure safe link URL (never logs or leaks sensitive tokens outside email body)
  const safeLink = link || '#';
  const displayEmail = email || '';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>[링커엑스] 가입을 계속하려면 이메일을 확인해 주세요</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: 'Malgun Gothic', Dotum, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif; -webkit-font-smoothing: antialiased; word-break: keep-all;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); overflow: hidden;">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding: 36px 36px 20px 36px; border-bottom: 1px solid #f1f5f9;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <!-- Text Brand Header (Always visible even when images are blocked) -->
                    <div style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #0f172a; line-height: 1.2;">
                      <span style="color: #2563eb;">LINKER</span><span style="color: #0f172a;">-X</span>
                      <span style="display: inline-block; margin-left: 8px; font-size: 16px; font-weight: 700; color: #64748b; vertical-align: middle;">링커엑스</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 36px 28px 36px;">
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.4; letter-spacing: -0.3px;">
                이메일 주소를 확인해 주세요
              </h1>

              <p style="margin: 0 0 28px 0; font-size: 15px; color: #334155; line-height: 1.65;">
                링커엑스에 가입해 주셔서 감사합니다.<br>
                아래 버튼을 눌러 이메일을 확인하고 가입을 계속해 주세요.
              </p>

              <!-- CTA Button Section (Minimum 48px touch target for mobile) -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 28px 0;">
                <tr>
                  <td align="center">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeLink}" style="height:50px;v-text-anchor:middle;width:240px;" arcsize="16%" stroke="f" fillcolor="#2563eb">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:'Malgun Gothic',sans-serif;font-size:16px;font-weight:bold;">이메일 인증하기</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="${safeLink}" target="_blank" rel="noopener noreferrer" style="display: block; width: 220px; background-color: #2563eb; color: #ffffff !important; text-align: center; font-size: 16px; font-weight: 700; text-decoration: none; padding: 15px 24px; border-radius: 10px; line-height: 1.2; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);">
                      이메일 인증하기
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px 0; font-size: 13.5px; color: #64748b; line-height: 1.5; text-align: center;">
                가입을 요청하지 않으셨다면 이 메일을 무시하셔도 됩니다.
              </p>

              <!-- Direct Link Fallback Box (For broken buttons or copy-paste) -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-top: 20px;">
                <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #64748b;">
                  버튼이 클릭되지 않으시면 아래 링크를 복사하여 브라우저 주소창에 입력해 주세요:
                </p>
                <p style="margin: 0; font-size: 12px; color: #2563eb; word-break: break-all; line-height: 1.4;">
                  <a href="${safeLink}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${safeLink}</a>
                </p>
              </div>

              ${displayEmail ? `
              <p style="margin: 16px 0 0 0; font-size: 12px; color: #94a3b8; text-align: center;">
                수신 이메일: ${displayEmail}
              </p>` : ''}
            </td>
          </tr>

          <!-- Brand Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 36px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13.5px; font-weight: 800; color: #1e293b; letter-spacing: -0.2px;">
                링커엑스 · 주문부터 상차, 전표, 배송까지 한곳에서
              </p>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                수주 접수부터 물류 상차, 전자 매출전표 발행, 실시간 배송 및 재고 마감까지 한곳에서 관리하는 통합 물류 솔루션입니다.
              </p>
              <p style="margin: 0; font-size: 11.5px; color: #94a3b8; line-height: 1.4;">
                문의: support@linker-x.com (평일 09:00 ~ 18:00) | 링커엑스 고객지원센터<br>
                © LINKER-X. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateVerificationEmailPlainText({ link, email }) {
  const safeLink = link || '';
  const displayEmail = email || '';

  return `[링커엑스] 가입을 계속하려면 이메일을 확인해 주세요

이메일 주소를 확인해 주세요

링커엑스에 가입해 주셔서 감사합니다.
아래 링크를 브라우저에 입력하여 이메일을 확인하고 가입을 계속해 주세요.

이메일 인증 링크:
${safeLink}

가입을 요청하지 않으셨다면 이 메일을 무시하셔도 됩니다.
${displayEmail ? `수신 이메일: ${displayEmail}\n` : ''}
------------------------------------------------------------
링커엑스 · 주문부터 상차, 전표, 배송까지 한곳에서
수주 접수부터 물류 상차, 전자 매출전표 발행, 실시간 배송 및 재고 마감까지 한곳에서 관리하는 통합 물류 솔루션입니다.

문의: support@linker-x.com (평일 09:00 ~ 18:00) | 링커엑스 고객지원센터
© LINKER-X. All rights reserved.
`;
}
