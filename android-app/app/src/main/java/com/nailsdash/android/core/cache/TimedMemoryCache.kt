package com.nailsdash.android.core.cache

class TimedMemoryCache<K, V>(
    private val ttlMs: Long,
    private val maxEntries: Int,
) {
    private data class Entry<V>(
        val value: V,
        val expiresAtMs: Long,
    )

    private val entries = LinkedHashMap<K, Entry<V>>(maxEntries, 0.75f, true)

    @Synchronized
    fun get(key: K): V? {
        pruneExpiredLocked()
        val entry = entries[key] ?: return null
        if (entry.expiresAtMs <= nowMs()) {
            entries.remove(key)
            return null
        }
        return entry.value
    }

    @Synchronized
    fun put(key: K, value: V) {
        entries[key] = Entry(
            value = value,
            expiresAtMs = nowMs() + ttlMs,
        )
        trimToSizeLocked()
    }

    @Synchronized
    fun remove(key: K) {
        entries.remove(key)
    }

    @Synchronized
    fun clear() {
        entries.clear()
    }

    private fun pruneExpiredLocked() {
        if (entries.isEmpty()) return
        val now = nowMs()
        val iterator = entries.entries.iterator()
        while (iterator.hasNext()) {
            if (iterator.next().value.expiresAtMs <= now) {
                iterator.remove()
            }
        }
    }

    private fun trimToSizeLocked() {
        while (entries.size > maxEntries) {
            val iterator = entries.entries.iterator()
            if (!iterator.hasNext()) return
            iterator.next()
            iterator.remove()
        }
    }

    private fun nowMs(): Long = System.currentTimeMillis()
}
