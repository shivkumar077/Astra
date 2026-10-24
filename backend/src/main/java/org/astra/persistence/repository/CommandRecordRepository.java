package org.astra.persistence.repository;

import org.astra.persistence.entity.CommandRecordEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommandRecordRepository extends JpaRepository<CommandRecordEntity, Long> {
    Optional<CommandRecordEntity> findByCommandId(String commandId);
    Optional<CommandRecordEntity> findByClientCommandId(String clientCommandId);
    List<CommandRecordEntity> findBySpacecraftIdOrderBySubmittedAtDesc(String spacecraftId);
    List<CommandRecordEntity> findTop1000ByOrderBySubmittedAtDesc();
}
