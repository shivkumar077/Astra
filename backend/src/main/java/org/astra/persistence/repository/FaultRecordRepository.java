package org.astra.persistence.repository;

import org.astra.persistence.entity.FaultRecordEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FaultRecordRepository extends JpaRepository<FaultRecordEntity, Long> {
    Optional<FaultRecordEntity> findByFaultId(String faultId);
    List<FaultRecordEntity> findBySpacecraftIdOrderByInjectedEpochDesc(String spacecraftId);
    List<FaultRecordEntity> findTop500ByOrderByInjectedEpochDesc();
    List<FaultRecordEntity> findByLifecycleState(String lifecycleState);
}
