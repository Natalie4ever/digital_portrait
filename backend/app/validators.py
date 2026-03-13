# 身份证号、手机号、日期合法性校验
from __future__ import annotations

from typing import Optional, Union
import re
from datetime import datetime, date


def validate_id_number(value: Optional[str]) -> Optional[str]:
    if not value or not value.strip():
        return None
    value = value.strip()
    # 18 位身份证
    if len(value) != 18:
        raise ValueError("证件号码必须为18位")
    if not re.match(r"^\d{17}[\dXx]$", value):
        raise ValueError("证件号码格式不正确")
    # 校验码
    weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
    check_codes = "10X98765432"
    s = sum(int(value[i]) * weights[i] for i in range(17))
    if check_codes[s % 11] != value[17].upper():
        raise ValueError("证件号码校验失败")
    # 出生日期
    birth = value[6:14]
    try:
        datetime.strptime(birth, "%Y%m%d")
    except ValueError:
        raise ValueError("证件号码中出生日期不合法")
    return value


def validate_mobile(value: Optional[str]) -> Optional[str]:
    if not value or not value.strip():
        return None
    value = value.strip()
    if not re.match(r"^1[3-9]\d{9}$", value):
        raise ValueError("手机号格式不正确")
    return value


def validate_phone(value: Optional[str]) -> Optional[str]:
    if not value or not value.strip():
        return None
    value = value.strip()
    if not re.match(r"^[\d\-+\s]{7,20}$", value):
        raise ValueError("电话格式不正确")
    return value


def validate_date(value: Optional[Union[str, date]]) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, str) and not value.strip():
        return None
    if isinstance(value, str):
        value = value.strip()
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y%m%d"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    raise ValueError("日期格式不正确，请使用 YYYY-MM-DD")
