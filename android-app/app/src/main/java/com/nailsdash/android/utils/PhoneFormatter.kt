package com.nailsdash.android.utils

object PhoneFormatter {
    fun normalizeUSPhone(input: String): String {
        val digits = input.filter(Char::isDigit)
        return if (digits.length == 10) "1$digits" else digits
    }
}
