package com.audirex

import android.app.Activity
import android.content.ContentUris
import android.content.Intent
import android.media.MediaScannerConnection
import android.os.Build
import android.provider.DocumentsContract
import android.provider.MediaStore
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import java.io.File

class LocalMusicModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  private var folderPickerPromise: Promise? = null
  private val FOLDER_PICKER_REQUEST_CODE = 9921

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName() = "LocalMusic"

  /* =========================================================
   * 1. SYSTEM FOLDER PICKER DIALOG (SAF)
   * ========================================================= */
  @ReactMethod
  fun pickFolder(promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "Current activity does not exist.")
      return
    }

    folderPickerPromise = promise

    try {
      val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
        flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
      }
      activity.startActivityForResult(intent, FOLDER_PICKER_REQUEST_CODE)
    } catch (e: Exception) {
      folderPickerPromise?.reject("PICKER_ERROR", e.message, e)
      folderPickerPromise = null
    }
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode == FOLDER_PICKER_REQUEST_CODE) {
      if (resultCode == Activity.RESULT_OK && data?.data != null) {
        val treeUri = data.data!!
        try {
          reactApplicationContext.contentResolver.takePersistableUriPermission(
            treeUri,
            Intent.FLAG_GRANT_READ_URI_PERMISSION
          )
        } catch (_: Exception) {}

        val docId = DocumentsContract.getTreeDocumentId(treeUri)
        val relativeFolder = if (docId.startsWith("primary:")) {
          docId.substringAfter("primary:")
        } else {
          docId
        }

        folderPickerPromise?.resolve(relativeFolder)
      } else {
        folderPickerPromise?.resolve(null)
      }
      folderPickerPromise = null
    }
  }

  override fun onNewIntent(intent: Intent) {}

  /* =========================================================
   * 2. SCAN STORAGE (FORCES ANDROID MEDIASTORE TO INDEX FILES)
   * ========================================================= */
  @ReactMethod
  fun scanStorage(promise: Promise) {
    try {
      val roots = arrayOf(
        File("/storage/emulated/0/Music"),
        File("/storage/emulated/0/Download"),
        File("/storage/emulated/0/Downloads")
      )

      val filesToScan = mutableListOf<String>()

      for (root in roots) {
        if (root.exists() && root.isDirectory) {
          root.walkTopDown().filter { file ->
            file.isFile && (
              file.extension.equals("mp3", ignoreCase = true) ||
              file.extension.equals("m4a", ignoreCase = true) ||
              file.extension.equals("wav", ignoreCase = true) ||
              file.extension.equals("flac", ignoreCase = true) ||
              file.extension.equals("aac", ignoreCase = true) ||
              file.extension.equals("ogg", ignoreCase = true)
            )
          }.forEach { filesToScan.add(it.absolutePath) }
        }
      }

      if (filesToScan.isEmpty()) {
        promise.resolve(0)
        return
      }

      MediaScannerConnection.scanFile(
        reactApplicationContext,
        filesToScan.toTypedArray(),
        null
      ) { _, _ -> }

      promise.resolve(filesToScan.size)
    } catch (e: Exception) {
      promise.reject("SCAN_ERROR", e.message, e)
    }
  }

  /* =========================================================
   * 3. QUERY SONGS
   * ========================================================= */
  @ReactMethod
  fun getSongs(query: String?, allowedFolders: ReadableArray?, promise: Promise) {
    try {
      val genreMap = mutableMapOf<Long, String>()

      try {
        val genresUri = MediaStore.Audio.Genres.EXTERNAL_CONTENT_URI
        val genresProjection = arrayOf(
          MediaStore.Audio.Genres._ID,
          MediaStore.Audio.Genres.NAME
        )

        reactApplicationContext.contentResolver.query(
          genresUri,
          genresProjection,
          null,
          null,
          null
        )?.use { gCursor ->
          val idCol = gCursor.getColumnIndex(MediaStore.Audio.Genres._ID)
          val nameCol = gCursor.getColumnIndex(MediaStore.Audio.Genres.NAME)

          if (idCol >= 0 && nameCol >= 0) {
            while (gCursor.moveToNext()) {
              val genreId = gCursor.getLong(idCol)
              val genreName = gCursor.getString(nameCol)?.trim()

              if (!genreName.isNullOrEmpty()) {
                val membersUri = MediaStore.Audio.Genres.Members.getContentUri("external", genreId)
                val membersProjection = arrayOf(MediaStore.Audio.Genres.Members.AUDIO_ID)

                reactApplicationContext.contentResolver.query(
                  membersUri,
                  membersProjection,
                  null,
                  null,
                  null
                )?.use { mCursor ->
                  val audioIdCol = mCursor.getColumnIndex(MediaStore.Audio.Genres.Members.AUDIO_ID)
                  if (audioIdCol >= 0) {
                    while (mCursor.moveToNext()) {
                      val audioId = mCursor.getLong(audioIdCol)
                      genreMap[audioId] = genreName
                    }
                  }
                }
              }
            }
          }
        }
      } catch (_: Exception) {}

      val projectionList = mutableListOf(
        MediaStore.Audio.Media._ID,
        MediaStore.Audio.Media.TITLE,
        MediaStore.Audio.Media.ARTIST,
        MediaStore.Audio.Media.ALBUM,
        MediaStore.Audio.Media.ALBUM_ID,
        MediaStore.Audio.Media.DURATION,
        MediaStore.Audio.Media.DATA,
        MediaStore.Audio.Media.DATE_ADDED
      )

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        projectionList.add(MediaStore.Audio.Media.GENRE)
      }

      val projection = projectionList.toTypedArray()

      val patterns = mutableListOf<String>()

      if (allowedFolders != null && allowedFolders.size() > 0) {
        for (i in 0 until allowedFolders.size()) {
          val folder = allowedFolders.getString(i)?.trim()
          if (!folder.isNullOrEmpty()) {
            patterns.add("%/$folder/%")
          }
        }
      }

      if (patterns.isEmpty()) {
        patterns.add("%/Music/%")
        patterns.add("%/music/%")
        patterns.add("%/Download/%")
        patterns.add("%/download/%")
        patterns.add("%/Downloads/%")
        patterns.add("%/downloads/%")
      }

      val where = StringBuilder("(${MediaStore.Audio.Media.IS_MUSIC} != 0 OR ${MediaStore.Audio.Media.DATA} LIKE '%/Download/%' OR ${MediaStore.Audio.Media.DATA} LIKE '%/Music/%') AND ${MediaStore.Audio.Media.DURATION} >= 10000")
      val arguments = mutableListOf<String>()

      where.append(" AND (")
      patterns.forEachIndexed { index, pattern ->
        if (index > 0) where.append(" OR ")
        where.append("${MediaStore.Audio.Media.DATA} LIKE ?")
        arguments.add(pattern)
      }
      where.append(")")

      if (!query.isNullOrBlank()) {
        where.append(
          " AND (" +
            "${MediaStore.Audio.Media.TITLE} LIKE ? OR " +
            "${MediaStore.Audio.Media.ARTIST} LIKE ? OR " +
            "${MediaStore.Audio.Media.ALBUM} LIKE ?" +
            ")"
        )
        val term = "%${query.trim()}%"
        arguments.add(term)
        arguments.add(term)
        arguments.add(term)
      }

      val songs = Arguments.createArray()

      reactApplicationContext.contentResolver.query(
        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
        projection,
        where.toString(),
        arguments.takeIf { it.isNotEmpty() }?.toTypedArray(),
        "${MediaStore.Audio.Media.TITLE} COLLATE NOCASE ASC"
      )?.use { cursor ->

        val idIndex = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
        val titleIndex = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
        val artistIndex = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
        val albumIndex = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
        val albumIdIndex = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
        val durationIndex = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
        val pathIndex = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA)
        val dateAddedIndex = cursor.getColumnIndex(MediaStore.Audio.Media.DATE_ADDED)

        val directGenreIndex = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          cursor.getColumnIndex(MediaStore.Audio.Media.GENRE)
        } else {
          -1
        }

        while (cursor.moveToNext()) {
          val mediaId = cursor.getLong(idIndex)
          val albumId = cursor.getLong(albumIdIndex)
          val dateAdded = if (dateAddedIndex >= 0) cursor.getLong(dateAddedIndex) else 0L

          var genre: String? = null
          if (directGenreIndex >= 0) {
            genre = cursor.getString(directGenreIndex)?.trim()
          }

          if (genre.isNullOrEmpty()) {
            genre = genreMap[mediaId]
          }

          if (genre.isNullOrEmpty()) {
            genre = "Unknown Genre"
          }

          val artworkUri = if (albumId > 0) {
            "content://media/external/audio/albumart/$albumId"
          } else {
            null
          }

          val songMap = Arguments.createMap().apply {
            putString("id", mediaId.toString())
            putString("title", cursor.getString(titleIndex) ?: "Unknown title")
            putString("artist", cursor.getString(artistIndex) ?: "Unknown artist")
            putString("album", cursor.getString(albumIndex) ?: "Unknown album")
            putString("genre", genre)
            putString("albumId", albumId.toString())
            putDouble("duration", cursor.getLong(durationIndex).toDouble())
            putDouble("dateAdded", dateAdded.toDouble())
            putString("path", cursor.getString(pathIndex))
            putString(
              "uri",
              ContentUris.withAppendedId(
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                mediaId
              ).toString()
            )
            if (artworkUri != null) {
              putString("artwork", artworkUri)
            }
          }

          songs.pushMap(songMap)
        }
      }

      promise.resolve(songs)

    } catch (exception: Exception) {
      promise.reject(
        "LOCAL_MUSIC_ERROR",
        "Unable to read the device music library.",
        exception
      )
    }
  }
}