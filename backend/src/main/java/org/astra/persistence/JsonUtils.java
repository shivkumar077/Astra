package org.astra.persistence;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Utility for JSON serialization/deserialization of persistence payloads.
 */
public final class JsonUtils {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private static final TypeReference<Map<String, String>> STR_MAP_TYPE = new TypeReference<>() {};

    private JsonUtils() {
    }

    public static String toJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return MAPPER.writeValueAsString(value);
        } catch (Exception e) {
            return "{}";
        }
    }

    public static Map<String, Object> fromJson(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return MAPPER.readValue(json, MAP_TYPE);
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }

    private static final TypeReference<List<String>> STR_LIST_TYPE = new TypeReference<>() {};
    private static final TypeReference<Map<String, Boolean>> BOOL_MAP_TYPE = new TypeReference<>() {};

    public static Map<String, String> fromJsonToStringMap(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return MAPPER.readValue(json, STR_MAP_TYPE);
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }

    public static List<String> fromJsonToList(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return MAPPER.readValue(json, STR_LIST_TYPE);
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public static Map<String, Boolean> fromJsonToBooleanMap(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return MAPPER.readValue(json, BOOL_MAP_TYPE);
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }
}
