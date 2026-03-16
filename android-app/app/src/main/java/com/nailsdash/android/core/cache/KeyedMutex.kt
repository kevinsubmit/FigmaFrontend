package com.nailsdash.android.core.cache

import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class KeyedMutex<K> {
    private val locks = ConcurrentHashMap<K, Mutex>()

    suspend fun <T> withLock(key: K, action: suspend () -> T): T {
        return locks.getOrPut(key) { Mutex() }.withLock {
            action()
        }
    }
}
