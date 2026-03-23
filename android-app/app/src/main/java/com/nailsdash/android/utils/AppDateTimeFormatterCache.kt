package com.nailsdash.android.utils

import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale

object AppDateTimeFormatterCache {
    private val serverNaiveUtcParsers: List<DateTimeFormatter> = listOf(
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSSSSS", Locale.US),
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS", Locale.US),
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss", Locale.US),
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSSSS", Locale.US),
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS", Locale.US),
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss", Locale.US),
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm", Locale.US),
    )

    private val dateDisplayFormatter: DateTimeFormatter =
        DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US)
    private val shortDateDisplayFormatter: DateTimeFormatter =
        DateTimeFormatter.ofPattern("M/d/yy", Locale.US)
    private val monthDayDisplayFormatter: DateTimeFormatter =
        DateTimeFormatter.ofPattern("MMM d", Locale.US)
    private val dateTimeDisplayFormatter: DateTimeFormatter =
        DateTimeFormatter.ofPattern("MMM d, yyyy · h:mm a", Locale.US)
    private val timeDisplayFormatter: DateTimeFormatter =
        DateTimeFormatter.ofPattern("h:mm a", Locale.US)

    val displayZoneId: ZoneId
        get() = ZoneId.systemDefault()

    fun parseServerInstant(raw: String?): Instant? {
        val value = raw?.trim().orEmpty()
        if (value.isBlank()) return null

        runCatching { OffsetDateTime.parse(value).toInstant() }
            .getOrNull()
            ?.let { return it }

        runCatching { Instant.parse(value) }
            .getOrNull()
            ?.let { return it }

        if (!hasTimezoneInfo(value)) {
            val normalized = normalizedUtcIso(value)
            runCatching { OffsetDateTime.parse(normalized).toInstant() }
                .getOrNull()
                ?.let { return it }
            runCatching { Instant.parse(normalized) }
                .getOrNull()
                ?.let { return it }
        }

        serverNaiveUtcParsers.forEach { formatter ->
            runCatching {
                LocalDateTime.parse(value, formatter)
                    .atOffset(ZoneOffset.UTC)
                    .toInstant()
            }.getOrNull()?.let { return it }
        }
        return null
    }

    fun parseServerDate(raw: String?): LocalDate? {
        parseServerInstant(raw)?.let { instant ->
            return instant.atZone(displayZoneId).toLocalDate()
        }

        val value = raw?.trim().orEmpty()
        if (value.isBlank()) return null

        runCatching { LocalDate.parse(value) }
            .getOrNull()
            ?.let { return it }

        if (value.length >= 10) {
            runCatching { LocalDate.parse(value.substring(0, 10)) }
                .getOrNull()
                ?.let { return it }
        }
        return null
    }

    fun parseServerDateTime(raw: String?): LocalDateTime? {
        return parseServerInstant(raw)?.atZone(displayZoneId)?.toLocalDateTime()
    }

    fun formatDisplayDateTime(raw: String?): String? {
        val dateTime = parseServerDateTime(raw) ?: return null
        return dateTime.format(dateTimeDisplayFormatter)
    }

    fun formatDisplayDateOnly(raw: String?): String? {
        val date = parseServerDate(raw) ?: return null
        return date.format(shortDateDisplayFormatter)
    }

    fun formatLongDate(raw: String?): String? {
        val date = parseServerDate(raw) ?: return null
        return date.format(dateDisplayFormatter)
    }

    fun formatMonthDay(raw: String?): String? {
        val date = parseServerDate(raw) ?: return null
        return date.format(monthDayDisplayFormatter)
    }

    fun formatNaiveDate(raw: String?): String? {
        val value = raw?.trim().orEmpty()
        if (value.isBlank()) return null
        return runCatching {
            LocalDate.parse(value).format(dateDisplayFormatter)
        }.getOrNull()
    }

    fun formatNaiveTime(raw: String?): String? {
        val value = raw?.trim().orEmpty()
        if (value.isBlank()) return null
        val normalized = when {
            value.length >= 8 -> value.take(8)
            value.length == 5 -> "$value:00"
            else -> value
        }
        return runCatching {
            LocalTime.parse(normalized).format(timeDisplayFormatter)
        }.getOrNull()
    }

    private fun hasTimezoneInfo(value: String): Boolean {
        return value.endsWith("Z", ignoreCase = true) ||
            Regex("[+-]\\d{2}:\\d{2}$").containsMatchIn(value)
    }

    private fun normalizedUtcIso(value: String): String {
        if (value.contains("T")) return "${value}Z"
        return value.replace(" ", "T") + "Z"
    }
}
