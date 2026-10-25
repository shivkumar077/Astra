package org.astra.persistence.entity;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * JPA entity representing a durable mission definition scenario in the ASTRA catalog.
 */
@Entity
@Table(name = "mission_definitions")
public class MissionDefinitionEntity {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "title", length = 255, nullable = false)
    private String title;

    @Column(name = "destination", length = 255, nullable = false)
    private String destination;

    @Column(name = "destination_group", length = 64, nullable = false)
    private String destinationGroup;

    @Column(name = "category", length = 64, nullable = false)
    private String category;

    @Column(name = "difficulty", length = 64, nullable = false)
    private String difficulty;

    @Column(name = "spacecraft_id", length = 64, nullable = false)
    private String spacecraftId;

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;

    @Column(name = "risk_level", length = 32, nullable = false)
    private String riskLevel;

    @Column(name = "synopsis", columnDefinition = "TEXT", nullable = false)
    private String synopsis;

    @Column(name = "objectives_json", columnDefinition = "TEXT")
    private String objectivesJson;

    @Column(name = "completion_criteria_json", columnDefinition = "TEXT")
    private String completionCriteriaJson;

    @Column(name = "operational_constraints_json", columnDefinition = "TEXT")
    private String operationalConstraintsJson;

    @Column(name = "is_simulated", nullable = false)
    private boolean isSimulated;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public MissionDefinitionEntity() {
    }

    public MissionDefinitionEntity(
            String id,
            String title,
            String destination,
            String destinationGroup,
            String category,
            String difficulty,
            String spacecraftId,
            int durationMinutes,
            String riskLevel,
            String synopsis,
            String objectivesJson,
            String completionCriteriaJson,
            String operationalConstraintsJson,
            boolean isSimulated
    ) {
        this.id = id;
        this.title = title;
        this.destination = destination;
        this.destinationGroup = destinationGroup;
        this.category = category;
        this.difficulty = difficulty;
        this.spacecraftId = spacecraftId;
        this.durationMinutes = durationMinutes;
        this.riskLevel = riskLevel;
        this.synopsis = synopsis;
        this.objectivesJson = objectivesJson;
        this.completionCriteriaJson = completionCriteriaJson;
        this.operationalConstraintsJson = operationalConstraintsJson;
        this.isSimulated = isSimulated;
        this.createdAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDestination() {
        return destination;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }

    public String getDestinationGroup() {
        return destinationGroup;
    }

    public void setDestinationGroup(String destinationGroup) {
        this.destinationGroup = destinationGroup;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public String getSpacecraftId() {
        return spacecraftId;
    }

    public void setSpacecraftId(String spacecraftId) {
        this.spacecraftId = spacecraftId;
    }

    public int getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(int durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public void setRiskLevel(String riskLevel) {
        this.riskLevel = riskLevel;
    }

    public String getSynopsis() {
        return synopsis;
    }

    public void setSynopsis(String synopsis) {
        this.synopsis = synopsis;
    }

    public String getObjectivesJson() {
        return objectivesJson;
    }

    public void setObjectivesJson(String objectivesJson) {
        this.objectivesJson = objectivesJson;
    }

    public String getCompletionCriteriaJson() {
        return completionCriteriaJson;
    }

    public void setCompletionCriteriaJson(String completionCriteriaJson) {
        this.completionCriteriaJson = completionCriteriaJson;
    }

    public String getOperationalConstraintsJson() {
        return operationalConstraintsJson;
    }

    public void setOperationalConstraintsJson(String operationalConstraintsJson) {
        this.operationalConstraintsJson = operationalConstraintsJson;
    }

    public boolean isSimulated() {
        return isSimulated;
    }

    public void setSimulated(boolean simulated) {
        isSimulated = simulated;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
