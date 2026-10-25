package org.astra.persistence.repository;

import org.astra.persistence.entity.MissionRunEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MissionRunRepository extends JpaRepository<MissionRunEntity, Long> {
    Optional<MissionRunEntity> findByRunId(String runId);
    List<MissionRunEntity> findByMissionIdOrderByStartedEpochDesc(String missionId);
    List<MissionRunEntity> findBySpacecraftIdOrderByStartedEpochDesc(String spacecraftId);
    List<MissionRunEntity> findTop500ByOrderByStartedEpochDesc();
}
