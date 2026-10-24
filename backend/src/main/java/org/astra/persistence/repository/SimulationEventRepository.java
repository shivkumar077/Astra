package org.astra.persistence.repository;

import org.astra.persistence.entity.SimulationEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SimulationEventRepository extends JpaRepository<SimulationEventEntity, Long> {
    Optional<SimulationEventEntity> findByEventId(String eventId);
    Optional<SimulationEventEntity> findTopByOrderBySequenceNumberDesc();
    List<SimulationEventEntity> findTop1000ByOrderBySequenceNumberDesc();
    List<SimulationEventEntity> findBySpacecraftIdOrderBySequenceNumberDesc(String spacecraftId);
}
