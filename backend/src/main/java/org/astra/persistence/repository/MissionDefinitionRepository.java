package org.astra.persistence.repository;

import org.astra.persistence.entity.MissionDefinitionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MissionDefinitionRepository extends JpaRepository<MissionDefinitionEntity, String> {
    Optional<MissionDefinitionEntity> findById(String id);
    List<MissionDefinitionEntity> findByDestinationGroupIgnoreCase(String destinationGroup);
}
