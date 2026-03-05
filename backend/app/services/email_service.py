"""Email service using Resend for partner activation."""

import logging

import resend

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_partner_activation_email(to_email: str, activation_link: str) -> bool:
    """
    Send partner activation email via Resend.
    Returns True on success, False on failure.
    Does not raise — caller should check return value and rollback if False.
    """
    if not settings.resend_api_key:
        logger.error("RESEND_API_KEY not configured, cannot send activation email")
        return False

    resend.api_key = settings.resend_api_key
    from_addr = settings.resend_from or settings.smtp_from
    if " <" not in from_addr and "<" not in from_addr:
        from_addr = f"AvtoHub <{from_addr}>"

    subject = "Активация партнёрского аккаунта AvtoHub"
    expire_hours = getattr(settings, "activation_token_expire_hours", 24)
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .button {{ display: inline-block; padding: 12px 24px; background: #10b981; color: white !important; text-decoration: none; border-radius: 8px; margin: 16px 0; }}
            .footer {{ margin-top: 24px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Добро пожаловать в AvtoHub!</h2>
            <p>Ваша заявка на подключение СТО одобрена.</p>
            <p>Для активации партнёрского аккаунта перейдите по ссылке и установите пароль:</p>
            <p><a href="{activation_link}" class="button">Установить пароль</a></p>
            <p>Ссылка действительна {expire_hours} часов.</p>
            <div class="footer">
                <p>AvtoHub KZ — платформа онлайн-записи в СТО</p>
            </div>
        </div>
    </body>
    </html>
    """

    try:
        params = {
            "from": from_addr,
            "to": [to_email],
            "subject": subject,
            "html": html,
        }
        resend.Emails.send(params)
        logger.info("Activation email sent to %s", to_email)
        return True
    except Exception as e:
        logger.exception("Failed to send activation email to %s: %s", to_email, e)
        return False


def send_partner_welcome_email(to_email: str, login_url: str) -> bool:
    """
    Send welcome email when partner already set password at registration.
    Returns True on success, False on failure.
    """
    if not settings.resend_api_key:
        logger.error("RESEND_API_KEY not configured, cannot send welcome email")
        return False

    resend.api_key = settings.resend_api_key
    from_addr = settings.resend_from or settings.smtp_from
    if " <" not in from_addr and "<" not in from_addr:
        from_addr = f"AvtoHub <{from_addr}>"

    subject = "Ваш партнёрский аккаунт AvtoHub активирован"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .button {{ display: inline-block; padding: 12px 24px; background: #10b981; color: white !important; text-decoration: none; border-radius: 8px; margin: 16px 0; }}
            .footer {{ margin-top: 24px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Добро пожаловать в AvtoHub!</h2>
            <p>Ваша заявка на подключение СТО одобрена. Ваш аккаунт активирован.</p>
            <p>Войдите в кабинет партнёра, используя email и пароль, указанные при регистрации:</p>
            <p><a href="{login_url}" class="button">Войти в кабинет</a></p>
            <div class="footer">
                <p>AvtoHub KZ — платформа онлайн-записи в СТО</p>
            </div>
        </div>
    </body>
    </html>
    """

    try:
        params = {
            "from": from_addr,
            "to": [to_email],
            "subject": subject,
            "html": html,
        }
        resend.Emails.send(params)
        logger.info("Welcome email sent to %s", to_email)
        return True
    except Exception as e:
        logger.exception("Failed to send welcome email to %s: %s", to_email, e)
        return False


def send_partner_rejection_email(to_email: str, reason: str | None = None) -> bool:
    """
    Send partner rejection email via Resend.
    Returns True on success, False on failure.
    """
    if not settings.resend_api_key:
        logger.error("RESEND_API_KEY not configured, cannot send rejection email")
        return False

    resend.api_key = settings.resend_api_key
    from_addr = settings.resend_from or settings.smtp_from
    if " <" not in from_addr and "<" not in from_addr:
        from_addr = f"AvtoHub <{from_addr}>"

    reason_html = f"<p><strong>Причина:</strong> {reason}</p>" if reason else ""

    subject = "Результат рассмотрения заявки AvtoHub"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .footer {{ margin-top: 24px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Результат рассмотрения заявки</h2>
            <p>К сожалению, ваша заявка на подключение СТО к платформе AvtoHub не была одобрена.</p>
            {reason_html}
            <p>Вы можете подать новую заявку, исправив указанные замечания.</p>
            <div class="footer">
                <p>AvtoHub KZ — платформа онлайн-записи в СТО</p>
            </div>
        </div>
    </body>
    </html>
    """

    try:
        params = {
            "from": from_addr,
            "to": [to_email],
            "subject": subject,
            "html": html,
        }
        resend.Emails.send(params)
        logger.info("Rejection email sent to %s", to_email)
        return True
    except Exception as e:
        logger.exception("Failed to send rejection email to %s: %s", to_email, e)
        return False
