package org.astra.persistence.repository;

import org.astra.persistence.entity.TelemetrySnapshotEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TelemetrySnapshotRepository extends JpaRepository<TelemetrySnapshotEntity, Long> {
    List<TelemetrySnapshotEntity> findBySpacecraftIdOrderBySimulationEpochDesc(String spacecraftId);
    long countBySpacecraftId(String spacecraftId);
}
