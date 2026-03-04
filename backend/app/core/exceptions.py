"""Application exceptions with error codes for unified API responses."""

from fastapi import HTTPException


class AppError(Exception):
    """Base application error."""

    def __init__(self, code: str, message: str, status_code: int = 500):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(AppError):
    """Resource not found."""

    def __init__(self, code: str, message: str):
        super().__init__(code=code, message=message, status_code=404)


class ValidationError(AppError):
    """Validation error."""

    def __init__(self, code: str, message: str):
        super().__init__(code=code, message=message, status_code=422)


class ConflictError(AppError):
    """Conflict (e.g. invalid state transition, duplicate)."""

    def __init__(self, code: str, message: str):
        super().__init__(code=code, message=message, status_code=409)


class ForbiddenError(AppError):
    """Access denied."""

    def __init__(self, code: str, message: str):
        super().__init__(code=code, message=message, status_code=403)


class BadRequestError(AppError):
    """Bad request (e.g. duplicate email)."""

    def __init__(self, code: str, message: str):
        super().__init__(code=code, message=message, status_code=400)


# Concrete error codes
class Errors:
    CLIENT_NOT_FOUND = ("CLIENT_NOT_FOUND", "Клиент с таким telegram_id не найден")
    USER_NOT_FOUND = ("USER_NOT_FOUND", "Пользователь не найден")
    STO_NOT_FOUND = ("STO_NOT_FOUND", "СТО не найдена")
    SERVICE_NOT_FOUND = ("SERVICE_NOT_FOUND", "Услуга не найдена или не принадлежит указанной СТО")
    BOOKING_NOT_FOUND = ("BOOKING_NOT_FOUND", "Запись не найдена")
    INVALID_STATUS_TRANSITION = (
        "INVALID_STATUS_TRANSITION",
        "Недопустимый переход статуса записи",
    )
    DUPLICATE_BOOKING = ("DUPLICATE_BOOKING", "Запись на этот слот уже существует")
    FORBIDDEN = ("FORBIDDEN", "Нет доступа к этой записи")
    EMAIL_EXISTS = ("EMAIL_EXISTS", "Email уже зарегистрирован")
    INVALID_CITY = ("INVALID_CITY", "Указанный город не найден")
    STO_ALREADY_EXISTS = (
        "STO_ALREADY_EXISTS",
        "У вас уже есть заявка или активное СТО",
    )
    STO_DUPLICATE_NAME_CITY = (
        "STO_DUPLICATE_NAME_CITY",
        "СТО с таким названием уже зарегистрирована в этом городе",
    )
    STO_NOT_PENDING = (
        "STO_NOT_PENDING",
        "Заявка уже обработана (не в статусе pending)",
    )
    REVIEW_ALREADY_EXISTS = ("REVIEW_ALREADY_EXISTS", "Отзыв на эту запись уже оставлен")
    REVIEW_BOOKING_NOT_COMPLETED = (
        "REVIEW_BOOKING_NOT_COMPLETED",
        "Отзыв можно оставить только после завершения записи",
    )
    SLOT_UNAVAILABLE = ("SLOT_UNAVAILABLE", "Время недоступно")
    STO_CLOSED = ("STO_CLOSED", "СТО не работает в выбранный день")
    EMAIL_SEND_FAILED = ("EMAIL_SEND_FAILED", "Не удалось отправить письмо активации")
    ACCOUNT_ALREADY_ACTIVATED = ("ACCOUNT_ALREADY_ACTIVATED", "Аккаунт уже активирован")
    REGION_NOT_FOUND = ("REGION_NOT_FOUND", "Область не найдена")
    INVALID_IIN = ("INVALID_IIN", "ИИН должен содержать 12 цифр")
    INVALID_BIN = ("INVALID_BIN", "БИН должен содержать 12 цифр")
    EMAIL_PENDING_EXISTS = ("EMAIL_PENDING_EXISTS", "Заявка с таким email уже на рассмотрении")
    IIN_PENDING_EXISTS = ("IIN_PENDING_EXISTS", "Заявка с таким ИИН уже на рассмотрении")
    PHOTO_TOO_LARGE = ("PHOTO_TOO_LARGE", "Размер фото не должен превышать 5 МБ")
    PHOTO_FORMAT_INVALID = ("PHOTO_FORMAT_INVALID", "Разрешены только jpg, png, webp")
    VALIDATION_ERROR = ("VALIDATION_ERROR", "Ошибка валидации")
    BOOKING_CONFIRMED_CANNOT_CANCEL = (
        "BOOKING_CONFIRMED_CANNOT_CANCEL",
        "Запись уже подтверждена и не может быть отменена",
    )
    SERVICE_ALREADY_ADDED = ("SERVICE_ALREADY_ADDED", "Услуга уже добавлена в это СТО")
    NOT_FOUND = ("NOT_FOUND", "Не найдено")
    SUPER_ADMIN_PROTECTED = ("SUPER_ADMIN_PROTECTED", "Нельзя изменить или удалить super_admin")
