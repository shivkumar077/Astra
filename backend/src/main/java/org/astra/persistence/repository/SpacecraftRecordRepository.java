package org.astra.persistence.repository;

import org.astra.persistence.entity.SpacecraftRecordEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpacecraftRecordRepository extends JpaRepository<SpacecraftRecordEntity, String> {
    List<SpacecraftRecordEntity> findAllByOrderByCreatedAtAsc();
}
